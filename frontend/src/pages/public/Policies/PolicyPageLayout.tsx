/**
 * PolicyPageLayout - Reusable layout for policy pages (Terms, Privacy, etc.)
 * Handles table of contents, scroll tracking, and responsive collapsing
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Text, Box } from "@mantine/core";
import { IconArrowLeft, IconChevronDown, IconList, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CONTACT_EMAILS } from "@/constants/contact";
import styles from "./PolicyPage.module.css";

/** Configuration for a section group (e.g., "Terms of Service", "Refund Policy") */
export interface SectionGroup {
  /** Unique ID prefix for sections (e.g., "terms", "privacy") */
  id: string;
  /** i18n key for the group title (e.g., "terms.title") */
  titleKey: string;
  /** Array of section keys within this group */
  sections: readonly string[];
  /** If true, this group shows as a major divider with its own header */
  showDivider?: boolean;
  /** i18n key for last updated date (only used with showDivider) */
  lastUpdatedKey?: string;
  /** Anchor ID for the divider (for deep linking) */
  anchorId?: string;
}

interface PolicyPageLayoutProps {
  /** i18n key for the page title (e.g., "terms.title") */
  pageTitleKey: string;
  /** i18n key for the last updated date (e.g., "terms.lastUpdated") */
  lastUpdatedKey: string;
  /** Array of section groups to render */
  sectionGroups: SectionGroup[];
}

export function PolicyPageLayout({
  pageTitleKey,
  lastUpdatedKey,
  sectionGroups,
}: PolicyPageLayoutProps) {
  const { t } = useTranslation("policies");

  // Compute all section IDs for state management
  const allSectionIds = useMemo(() =>
    sectionGroups.flatMap(group =>
      group.sections.map(section => `${group.id}-${section}`)
    ),
    [sectionGroups]
  );

  // Default active section is the first section of the first group
  const defaultActiveSection = allSectionIds[0] || "";

  const [activeSection, setActiveSection] = useState<string>(defaultActiveSection);
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
      setExpandedSections(new Set(allSectionIds));
    }
  }, [isMobile, allSectionIds]);

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

  // Render a single section
  const renderSection = (groupId: string, section: string) => {
    const sectionId = `${groupId}-${section}`;
    const isExpanded = expandedSections.has(sectionId);

    return (
      <section key={sectionId} id={sectionId} className={styles.section}>
        <div
          className={styles.sectionHeader}
          onClick={() => toggleSection(sectionId)}
        >
          <h3 className={styles.sectionTitle}>{t(`${groupId}.${section}.title`)}</h3>
          {isMobile && (
            <IconChevronDown
              size={20}
              className={`${styles.sectionToggle} ${isExpanded ? styles.expanded : ""}`}
            />
          )}
        </div>
        <div className={`${styles.sectionContent} ${isMobile && !isExpanded ? styles.collapsed : ""} ${isMobile && isExpanded ? styles.expanded : ""}`}>
          <Text>{t(`${groupId}.${section}.content`, CONTACT_EMAILS)}</Text>
        </div>
      </section>
    );
  };

  // Render TOC for a section group
  const renderTocGroup = (group: SectionGroup, isFirst: boolean) => (
    <li key={group.id} style={isFirst ? undefined : { marginTop: 16 }}>
      <span className={styles.tocItem} style={{ fontWeight: 600, color: "var(--mantine-color-dimmed)" }}>
        {t(group.titleKey)}
      </span>
      <ul className={styles.tocSublist}>
        {group.sections.map(section => (
          <li
            key={section}
            className={`${styles.tocSubItem} ${activeSection === `${group.id}-${section}` ? styles.active : ""}`}
            onClick={() => scrollToSection(`${group.id}-${section}`)}
          >
            {t(`${group.id}.${section}.title`)}
          </li>
        ))}
      </ul>
    </li>
  );

  // Render mobile TOC group (slightly different styling)
  const renderMobileTocGroup = (group: SectionGroup, isFirst: boolean) => (
    <li key={group.id} style={isFirst ? undefined : { marginTop: 16 }}>
      <span className={styles.tocItem} style={{ fontWeight: 600 }}>
        {t(group.titleKey)}
      </span>
      <ul className={styles.tocSublist}>
        {group.sections.map(section => (
          <li
            key={section}
            className={`${styles.tocSubItem} ${activeSection === `${group.id}-${section}` ? styles.active : ""}`}
            onClick={() => scrollToSection(`${group.id}-${section}`)}
          >
            {t(`${group.id}.${section}.title`)}
          </li>
        ))}
      </ul>
    </li>
  );

  return (
    <div className={styles.wrapper}>
      {/* Header Banner */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.backLink}>
            <IconArrowLeft size={16} />
            {t("backToHome")}
          </Link>
          <h1 className={styles.pageTitle}>{t(pageTitleKey)}</h1>
          <p className={styles.lastUpdated}>{t(lastUpdatedKey)}</p>
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
                {sectionGroups.map((group, index) => renderTocGroup(group, index === 0))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.content}>
          <div className={styles.mainCard}>
            {sectionGroups.map((group, groupIndex) => (
              <div key={group.id}>
                {/* Show divider for secondary groups */}
                {group.showDivider && groupIndex > 0 && (
                  <Box className={styles.majorDivider} id={group.anchorId || group.id}>
                    <h2 className={styles.majorTitle}>{t(group.titleKey)}</h2>
                    {group.lastUpdatedKey && (
                      <p className={styles.majorSubtitle}>{t(group.lastUpdatedKey)}</p>
                    )}
                  </Box>
                )}

                {/* Render all sections in this group */}
                {group.sections.map(section => renderSection(group.id, section))}
              </div>
            ))}
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
            {sectionGroups.map((group, index) => renderMobileTocGroup(group, index === 0))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
