/**
 * Policies Page - Display legal policies with navigation
 */

import type { ReactNode } from "react";
import { useParams, useNavigate, Link } from "@tanstack/react-router";
import {
  Container,
  Grid,
  Paper,
  Title,
  Text,
  Stack,
  UnstyledButton,
  Group,
  ThemeIcon,
  Divider,
  Anchor,
} from "@mantine/core";
import {
  IconFileText,
  IconShield,
  IconDatabase,
  IconRefresh,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./PoliciesPage.module.css";

type PolicyType = "terms" | "privacy" | "data-protection" | "refund";

interface PolicyNavItem {
  id: PolicyType;
  icon: typeof IconFileText;
  labelKey: string;
}

const policyNavItems: PolicyNavItem[] = [
  { id: "terms", icon: IconFileText, labelKey: "nav.terms" },
  { id: "privacy", icon: IconShield, labelKey: "nav.privacy" },
  { id: "data-protection", icon: IconDatabase, labelKey: "nav.dataProtection" },
  { id: "refund", icon: IconRefresh, labelKey: "nav.refund" },
];

function PolicyContent({ policyType }: { policyType: PolicyType }) {
  const { t } = useTranslation("policies");

  const renderSection = (sectionKey: string, items: string[]) => (
    <Stack gap="xs" key={sectionKey}>
      <Title order={4}>{t(`${policyType}.${sectionKey}.title`)}</Title>
      <Stack gap="xs">
        {items.map((item, index) => (
          <Text key={index} size="sm" c="dimmed">
            {t(`${policyType}.${sectionKey}.${item}`)}
          </Text>
        ))}
      </Stack>
    </Stack>
  );

  const getSections = (): ReactNode[] => {
    switch (policyType) {
      case "terms":
        return [
          renderSection("acceptance", ["content"]),
          renderSection("eligibility", ["content"]),
          renderSection("userAccounts", ["content"]),
          renderSection("prohibitedItems", ["content"]),
          renderSection("transactions", ["content"]),
          renderSection("liability", ["content"]),
          renderSection("modifications", ["content"]),
          renderSection("governingLaw", ["content"]),
        ];
      case "privacy":
        return [
          renderSection("introduction", ["content"]),
          renderSection("dataCollection", ["content"]),
          renderSection("dataUsage", ["content"]),
          renderSection("dataSharing", ["content"]),
          renderSection("dataSecurity", ["content"]),
          renderSection("userRights", ["content"]),
          renderSection("cookies", ["content"]),
          renderSection("pdpaCompliance", ["content"]),
          renderSection("contact", ["content"]),
        ];
      case "data-protection":
        return [
          renderSection("introduction", ["content"]),
          renderSection("dataController", ["content"]),
          renderSection("dataProcessing", ["content"]),
          renderSection("securityMeasures", ["content"]),
          renderSection("dataRetention", ["content"]),
          renderSection("userRights", ["content"]),
          renderSection("internationalTransfers", ["content"]),
          renderSection("breachNotification", ["content"]),
        ];
      case "refund":
        return [
          renderSection("overview", ["content"]),
          renderSection("eligibility", ["content"]),
          renderSection("process", ["content"]),
          renderSection("timeline", ["content"]),
          renderSection("nonRefundable", ["content"]),
          renderSection("disputes", ["content"]),
          renderSection("contact", ["content"]),
        ];
      default:
        return [];
    }
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t(`${policyType}.title`)}</Title>
        <Text size="sm" c="dimmed" mt="xs">
          {t(`${policyType}.lastUpdated`)}
        </Text>
      </div>
      <Divider />
      <Stack gap="xl">{getSections()}</Stack>
    </Stack>
  );
}

export function PoliciesPage() {
  const { policyType } = useParams({ strict: false }) as { policyType?: string };
  const navigate = useNavigate();
  const { t } = useTranslation("policies");

  const activePolicyType: PolicyType =
    (policyType && ["terms", "privacy", "data-protection", "refund"].includes(policyType))
      ? (policyType as PolicyType)
      : "terms";

  const handleNavClick = (id: PolicyType) => {
    navigate({ to: `/policies/${id}` });
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Back to home link */}
        <Anchor component={Link} to="/" size="sm">
          {t("backToHome")}
        </Anchor>

        <div>
          <Title order={1}>{t("pageTitle")}</Title>
          <Text c="dimmed" mt="sm">
            {t("pageSubtitle")}
          </Text>
        </div>

        <Grid gutter="xl">
          {/* Navigation Card */}
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Paper shadow="sm" p="md" radius="md" className={styles.navCard}>
              <Stack gap="xs">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
                  {t("navigation")}
                </Text>
                {policyNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePolicyType === item.id;

                  return (
                    <UnstyledButton
                      key={item.id}
                      className={`${styles.navButton} ${isActive ? styles.navButtonActive : ""}`}
                      onClick={() => handleNavClick(item.id)}
                    >
                      <Group gap="sm">
                        <ThemeIcon
                          variant={isActive ? "filled" : "light"}
                          size="md"
                          radius="md"
                        >
                          <Icon size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={isActive ? 600 : 400}>
                          {t(item.labelKey)}
                        </Text>
                        {isActive && <IconChevronRight size={14} className={styles.chevron} />}
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Content Card */}
          <Grid.Col span={{ base: 12, md: 9 }}>
            <Paper shadow="sm" p="xl" radius="md">
              <PolicyContent policyType={activePolicyType} />
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
