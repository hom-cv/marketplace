/**
 * Language Switcher Component
 * Toggle between English and Thai
 */

import { useTranslation } from "react-i18next";
import styles from "./LanguageSwitcher.module.css";

const languages = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "th", label: "TH", flag: "🇹🇭" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleToggle = () => {
    const newLang = i18n.language === "en" ? "th" : "en";
    i18n.changeLanguage(newLang);
  };

  const currentLang = languages.find((l) => i18n.language.startsWith(l.code)) || languages[0];
  const otherLang = languages.find((l) => !i18n.language.startsWith(l.code)) || languages[1];

  return (
    <button type="button" className={styles.toggle} onClick={handleToggle}>
      <span className={styles.active}>
        <span className={styles.flag}>{currentLang.flag}</span>
        <span className={styles.label}>{currentLang.label}</span>
      </span>
      <span className={styles.divider}>/</span>
      <span className={styles.inactive}>
        <span className={styles.flag}>{otherLang.flag}</span>
        <span className={styles.label}>{otherLang.label}</span>
      </span>
    </button>
  );
}
