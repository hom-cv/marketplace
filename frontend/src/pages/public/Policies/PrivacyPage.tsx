/**
 * Privacy Policy Page - Soft & Airy Design
 * Features table of contents sidebar on desktop, collapsible sections on mobile
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Text, Box } from "@mantine/core";
import { IconArrowLeft, IconChevronDown, IconList, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CONTACT_EMAILS } from "@/constants/contact";
import styles from "./PolicyPage.module.css";

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
  const [activeSection, setActiveSection] = useState<string>("privacy-introduction");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // On desktop, all sections are expanded by default
  useEffect(() => {
    if (!isMobile) {
      const allSections = [
        ...PRIVACY_SECTIONS.map(s => `privacy-${s}`),
        ...DATA_PROTECTION_SECTIONS.map(s => `data-protection-${s}`)
      ];
      setExpandedSections(new Set(allSections));
    }
  }, [isMobile]);

  const toggleSection = useCallback((sectionId: string) => {
    if (isMobile) {
      setExpandedSections(prev => {
        const next = new Set(prev);
        if (next.has(sectionId)) {
          next.delete(sectionId);
        } else {
          next.add(sectionId);
        }
        return next;
      });
    }
  }, [isMobile]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionId);
      if (isMobile) {
        setExpandedSections(prev => new Set([...prev, sectionId]));
        setMobileTocOpen(false);
      }
    }
  }, [isMobile]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll(`.${styles.section}`);
      let current = activeSection;

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100) {
          current = section.id;
        }
      });

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  return (
    <div className={styles.wrapper}>
      {/* Header Banner */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.backLink}>
            <IconArrowLeft size={16} />
            {t("backToHome")}
          </Link>
          <h1 className={styles.pageTitle}>{t("privacy.title")}</h1>
          <p className={styles.lastUpdated}>{t("privacy.lastUpdated")}</p>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.contentWrapper}>
        {/* Desktop Sidebar - Table of Contents */}
        <aside className={styles.sidebar}>
          <div className={styles.tocCard}>
            <h3 className={styles.tocTitle}>{t("toc.title", "Table of Contents")}</h3>
            <nav>
              <ul className={styles.tocList}>
                <li>
                  <span className={styles.tocItem} style={{ fontWeight: 600, color: "var(--mantine-color-dimmed)" }}>
                    {t("privacy.title")}
                  </span>
                  <ul className={styles.tocSublist}>
                    {PRIVACY_SECTIONS.map(section => (
                      <li
                        key={section}
                        className={`${styles.tocSubItem} ${activeSection === `privacy-${section}` ? styles.active : ""}`}
                        onClick={() => scrollToSection(`privacy-${section}`)}
                      >
                        {t(`privacy.${section}.title`)}
                      </li>
                    ))}
                  </ul>
                </li>
                <li style={{ marginTop: 16 }}>
                  <span className={styles.tocItem} style={{ fontWeight: 600, color: "var(--mantine-color-dimmed)" }}>
                    {t("data-protection.title")}
                  </span>
                  <ul className={styles.tocSublist}>
                    {DATA_PROTECTION_SECTIONS.map(section => (
                      <li
                        key={section}
                        className={`${styles.tocSubItem} ${activeSection === `data-protection-${section}` ? styles.active : ""}`}
                        onClick={() => scrollToSection(`data-protection-${section}`)}
                      >
                        {t(`data-protection.${section}.title`)}
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.content}>
          <div className={styles.mainCard}>
            {/* Privacy Sections */}
            {PRIVACY_SECTIONS.map(section => {
              const sectionId = `privacy-${section}`;
              const isExpanded = expandedSections.has(sectionId);

              return (
                <section key={section} id={sectionId} className={styles.section}>
                  <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection(sectionId)}
                  >
                    <h3 className={styles.sectionTitle}>{t(`privacy.${section}.title`)}</h3>
                    {isMobile && (
                      <IconChevronDown
                        size={20}
                        className={`${styles.sectionToggle} ${isExpanded ? styles.expanded : ""}`}
                      />
                    )}
                  </div>
                  <div className={`${styles.sectionContent} ${isMobile && !isExpanded ? styles.collapsed : ""} ${isMobile && isExpanded ? styles.expanded : ""}`}>
                    <Text>{t(`privacy.${section}.content`, CONTACT_EMAILS)}</Text>
                  </div>
                </section>
              );
            })}

            {/* Major Divider for Data Protection */}
            <Box className={styles.majorDivider} id="data-protection">
              <h2 className={styles.majorTitle}>{t("data-protection.title")}</h2>
              <p className={styles.majorSubtitle}>{t("data-protection.lastUpdated")}</p>
            </Box>

            {/* Data Protection Sections */}
            {DATA_PROTECTION_SECTIONS.map(section => {
              const sectionId = `data-protection-${section}`;
              const isExpanded = expandedSections.has(sectionId);

              return (
                <section key={section} id={sectionId} className={styles.section}>
                  <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection(sectionId)}
                  >
                    <h3 className={styles.sectionTitle}>{t(`data-protection.${section}.title`)}</h3>
                    {isMobile && (
                      <IconChevronDown
                        size={20}
                        className={`${styles.sectionToggle} ${isExpanded ? styles.expanded : ""}`}
                      />
                    )}
                  </div>
                  <div className={`${styles.sectionContent} ${isMobile && !isExpanded ? styles.collapsed : ""} ${isMobile && isExpanded ? styles.expanded : ""}`}>
                    <Text>{t(`data-protection.${section}.content`)}</Text>
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>

      {/* Mobile TOC Trigger */}
      <button
        className={styles.mobileTocTrigger}
        onClick={() => setMobileTocOpen(true)}
        aria-label="Open table of contents"
      >
        <IconList size={24} />
      </button>

      {/* Mobile TOC Sheet */}
      <div
        className={`${styles.backdrop} ${mobileTocOpen ? styles.visible : ""}`}
        onClick={() => setMobileTocOpen(false)}
      />
      <div className={`${styles.mobileTocSheet} ${mobileTocOpen ? styles.open : ""}`}>
        <div className={styles.mobileTocHeader}>
          <span className={styles.mobileTocTitle}>{t("toc.title", "Table of Contents")}</span>
          <button
            className={styles.mobileTocClose}
            onClick={() => setMobileTocOpen(false)}
            aria-label="Close table of contents"
          >
            <IconX size={18} />
          </button>
        </div>
        <nav>
          <ul className={styles.tocList}>
            <li>
              <span className={styles.tocItem} style={{ fontWeight: 600 }}>
                {t("privacy.title")}
              </span>
              <ul className={styles.tocSublist}>
                {PRIVACY_SECTIONS.map(section => (
                  <li
                    key={section}
                    className={`${styles.tocSubItem} ${activeSection === `privacy-${section}` ? styles.active : ""}`}
                    onClick={() => scrollToSection(`privacy-${section}`)}
                  >
                    {t(`privacy.${section}.title`)}
                  </li>
                ))}
              </ul>
            </li>
            <li style={{ marginTop: 16 }}>
              <span className={styles.tocItem} style={{ fontWeight: 600 }}>
                {t("data-protection.title")}
              </span>
              <ul className={styles.tocSublist}>
                {DATA_PROTECTION_SECTIONS.map(section => (
                  <li
                    key={section}
                    className={`${styles.tocSubItem} ${activeSection === `data-protection-${section}` ? styles.active : ""}`}
                    onClick={() => scrollToSection(`data-protection-${section}`)}
                  >
                    {t(`data-protection.${section}.title`)}
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
