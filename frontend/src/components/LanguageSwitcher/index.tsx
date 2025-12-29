/**
 * Language Switcher Component
 * Allows users to switch between English and Thai
 */

import { Menu, UnstyledButton, Group, Text } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <Menu shadow="md" width={150}>
      <Menu.Target>
        <UnstyledButton
          style={{
            padding: "6px 12px",
            borderRadius: "var(--mantine-radius-md)",
            border: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <Group gap="xs">
            <Text size="lg">{currentLang.flag}</Text>
            <Text size="sm">{currentLang.label}</Text>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {languages.map((lang) => (
          <Menu.Item
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            leftSection={<Text size="lg">{lang.flag}</Text>}
            style={{
              backgroundColor:
                i18n.language === lang.code
                  ? "var(--mantine-color-blue-0)"
                  : undefined,
            }}
          >
            {lang.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
