/**
 * PolicyPageLayout - Reusable layout for policy pages (Terms, Privacy, etc.)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Text, Box } from "@mantine/core";
import { IconArrowLeft, IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CONTACT_EMAILS } from "@/constants/contact";
import { TableOfContents, type TocGroup } from "./components/TableOfContents";
import { MobileTocDrawer } from "./components/MobileTocDrawer";
import styles from "./PolicyPage.module.css";


export interface SectionGroup {
  id: string;
  titleKey: string;
  sections: readonly string[];
  showDivider?: boolean;
  lastUpdatedKey?: string;
  anchorId?: string;
}

interface PolicyPageLayoutProps {
  pageTitleKey: string;
  lastUpdatedKey: string;
  sectionGroups: SectionGroup[];
}

const MOBILE_BREAKPOINT = 900;

export function PolicyPageLayout({
  pageTitleKey,
  lastUpdatedKey,
  sectionGroups,
}: PolicyPageLayoutProps) {
  const { t } = useTranslation("policies");

  // Compute all section IDs
  const allSectionIds = useMemo(
    () =>
      sectionGroups.flatMap((group) =>
        group.sections.map((section) => `${group.id}-${section}`)
      ),
    [sectionGroups]
  );

  // State
  const [activeSection, setActiveSection] = useState(allSectionIds[0] || "");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // On desktop, all sections are expanded
  useEffect(() => {
    if (!isMobile) {
      setExpandedSections(new Set(allSectionIds));
    }
  }, [isMobile, allSectionIds]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll(`.${styles.section}`);
      let current = activeSection;
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= 100) {
          current = section.id;
        }
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  const toggleSection = useCallback(
    (sectionId: string) => {
      if (isMobile) {
        setExpandedSections((prev) => {
          const next = new Set(prev);
          next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
          return next;
        });
      }
    },
    [isMobile]
  );

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setActiveSection(sectionId);
        if (isMobile) {
          setExpandedSections((prev) => new Set([...prev, sectionId]));
          setMobileTocOpen(false);
        }
      }
    },
    [isMobile]
  );

  // Transform section groups into TOC format
  const tocGroups: TocGroup[] = useMemo(
    () =>
      sectionGroups.map((group) => ({
        id: group.id,
        title: t(group.titleKey),
        items: group.sections.map((section) => ({
          id: `${group.id}-${section}`,
          title: t(`${group.id}.${section}.title`),
        })),
      })),
    [sectionGroups, t]
  );

  return (
    <div className={styles.wrapper}>
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

      <div className={styles.contentWrapper}>
        <aside className={styles.sidebar}>
          <TableOfContents
            title={t("toc.title", "Table of Contents")}
            groups={tocGroups}
            activeItemId={activeSection}
            onItemClick={scrollToSection}
          />
        </aside>

        <main className={styles.content}>
          <div className={styles.mainCard}>
            {sectionGroups.map((group, groupIndex) => (
              <div key={group.id}>
                {group.showDivider && groupIndex > 0 && (
                  <Box className={styles.majorDivider} id={group.anchorId || group.id}>
                    <h2 className={styles.majorTitle}>{t(group.titleKey)}</h2>
                    {group.lastUpdatedKey && (
                      <p className={styles.majorSubtitle}>{t(group.lastUpdatedKey)}</p>
                    )}
                  </Box>
                )}

                {group.sections.map((section) => {
                  const sectionId = `${group.id}-${section}`;
                  const isExpanded = expandedSections.has(sectionId);

                  return (
                    <section key={sectionId} id={sectionId} className={styles.section}>
                      <div
                        className={styles.sectionHeader}
                        onClick={() => toggleSection(sectionId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSection(sectionId);
                          }
                        }}
                        role={isMobile ? "button" : undefined}
                        tabIndex={isMobile ? 0 : undefined}
                        aria-expanded={isMobile ? isExpanded : undefined}
                      >
                        <h3 className={styles.sectionTitle}>
                          {t(`${group.id}.${section}.title`)}
                        </h3>
                        {isMobile && (
                          <IconChevronDown
                            size={20}
                            className={`${styles.sectionToggle} ${isExpanded ? styles.expanded : ""}`}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div
                        className={`${styles.sectionContent} ${isMobile ? (isExpanded ? styles.expanded : styles.collapsed) : ""
                          }`}
                      >
                        <Text>{t(`${group.id}.${section}.content`, CONTACT_EMAILS)}</Text>
                      </div>
                    </section>
                  );
                })}
              </div>
            ))}
          </div>
        </main>
      </div>

      <MobileTocDrawer
        isOpen={mobileTocOpen}
        onOpen={() => setMobileTocOpen(true)}
        onClose={() => setMobileTocOpen(false)}
        title={t("toc.title", "Table of Contents")}
        groups={tocGroups}
        activeItemId={activeSection}
        onItemClick={scrollToSection}
      />
    </div>
  );
}
