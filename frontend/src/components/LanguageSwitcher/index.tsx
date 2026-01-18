/**
 * Language Switcher Component
 */

import { Menu, UnstyledButton, Text } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./LanguageSwitcher.module.css";

const languages = [
  { code: "en", label: "EN" },
  { code: "th", label: "TH" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <Menu shadow="sm" width={100} position="bottom-end">
      <Menu.Target>
        <UnstyledButton className={styles.trigger}>
          <Text size="sm" fw={500}>{currentLang.label}</Text>
          <IconChevronDown size={14} stroke={1.5} />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {languages.map((lang) => (
          <Menu.Item
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={i18n.language === lang.code ? styles.active : undefined}
          >
            <Text size="sm">{lang.label}</Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
