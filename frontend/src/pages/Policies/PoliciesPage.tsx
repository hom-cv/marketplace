/**
 * Policies Page - Displays all platform policies
 * Uses NavLink for navigation, Paper for content cards
 */

import { useEffect, useState } from "react";
import { Container, Title, Text, Grid, Paper, NavLink, Stack, Divider } from "@mantine/core";
import {
  IconFileText,
  IconShield,
  IconLock,
  IconReceipt,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type PolicyTab = "terms" | "privacy" | "data-protection" | "refund";

export function PoliciesPage() {
  const { t } = useTranslation("policies");
  const [activeTab, setActiveTab] = useState<PolicyTab>("terms");

  // Handle URL hash for direct linking
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && ["terms", "privacy", "data-protection", "refund"].includes(hash)) {
      setActiveTab(hash as PolicyTab);
    }
  }, []);

  const handleTabChange = (value: PolicyTab) => {
    setActiveTab(value);
    window.history.replaceState(null, "", `#${value}`);
  };

  const renderPolicyContent = (policyKey: PolicyTab) => {
    const contentKey = policyKey === "data-protection" ? "dataProtection" : policyKey;
    const content = t(`policies.content.${contentKey}`, { returnObjects: true }) as Record<string, string>;

    return (
      <Stack gap="md">
        <Title order={3} c="blue">{content.title}</Title>
        <Text c="dimmed">{content.intro}</Text>
        <Divider />

        <div>
          <Text fw={600} mb="xs">{content.section1Title}</Text>
          <Text c="dimmed">{content.section1Content}</Text>
        </div>

        <div>
          <Text fw={600} mb="xs">{content.section2Title}</Text>
          <Text c="dimmed">{content.section2Content}</Text>
        </div>

        <div>
          <Text fw={600} mb="xs">{content.section3Title}</Text>
          <Text c="dimmed">{content.section3Content}</Text>
        </div>

        <div>
          <Text fw={600} mb="xs">{content.section4Title}</Text>
          <Text c="dimmed">{content.section4Content}</Text>
        </div>

        <div>
          <Text fw={600} mb="xs">{content.section5Title}</Text>
          <Text c="dimmed">{content.section5Content}</Text>
        </div>

        {content.section6Title && (
          <div>
            <Text fw={600} mb="xs">{content.section6Title}</Text>
            <Text c="dimmed">{content.section6Content}</Text>
          </div>
        )}
      </Stack>
    );
  };

  const navItems: { key: PolicyTab; icon: React.ReactNode; label: string }[] = [
    { key: "terms", icon: <IconFileText size={18} />, label: t("policies.termsAndConditions") },
    { key: "privacy", icon: <IconShield size={18} />, label: t("policies.privacyPolicy") },
    { key: "data-protection", icon: <IconLock size={18} />, label: t("policies.dataProtection") },
    { key: "refund", icon: <IconReceipt size={18} />, label: t("policies.refundPolicy") },
  ];

  return (
    <Container size="lg" my={40}>
      <Title order={2} mb="xs">{t("policies.title")}</Title>
      <Text c="dimmed" mb="xl">
        {t("policies.lastUpdated", { date: "December 29, 2025" })}
      </Text>

      <Grid gutter="xl">
        {/* Left: Navigation */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Stack gap={4}>
              {navItems.map((item) => (
                <NavLink
                  key={item.key}
                  label={item.label}
                  leftSection={item.icon}
                  active={activeTab === item.key}
                  onClick={() => handleTabChange(item.key)}
                  variant="light"
                />
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Right: Content */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            {renderPolicyContent(activeTab)}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
