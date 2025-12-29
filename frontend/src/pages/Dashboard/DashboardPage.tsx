import { useQuery } from "@tanstack/react-query";
import {
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Stack,
  Loader,
  Center,
  ThemeIcon,
} from "@mantine/core";
import {
  IconPackage,
  IconShoppingBag,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getPosts, getMyPosts } from "@/api/posts";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");

  const { data: allPosts, isLoading: loadingAll } = useQuery({
    queryKey: ["posts"],
    queryFn: () => getPosts(),
  });

  const { data: myPosts, isLoading: loadingMy } = useQuery({
    queryKey: ["posts", "me"],
    queryFn: () => getMyPosts(),
  });

  if (loadingAll || loadingMy) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  const stats = [
    {
      title: t("stats.totalListings"),
      value: myPosts?.length || 0,
      icon: IconPackage,
      color: "blue",
      link: "/app/my-listings",
    },
    {
      title: t("stats.marketplaceItems"),
      value: allPosts?.total || 0,
      icon: IconTrendingUp,
      color: "green",
      link: "/app/explore",
    },
    {
      title: t("stats.totalPurchases"),
      value: 0,
      icon: IconShoppingBag,
      color: "orange",
      link: "/app/purchases",
    },
    {
      title: t("stats.earnings"),
      value: 0,
      icon: IconReceipt,
      color: "grape",
      link: "/app/sales",
    },
  ];

  return (
    <Stack gap="xl">
      <div>
        <Title order={2} mb="xs">{t("title")}</Title>
        <Text c="dimmed">{t("welcome")}! {t("welcomeMessage")}</Text>
      </div>

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="lg">
        {stats.map((stat) => (
          <Link key={stat.title} to={stat.link} style={{ textDecoration: "none" }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: "pointer" }}>
              <Group>
                <ThemeIcon size="xl" radius="md" variant="light" color={stat.color}>
                  <stat.icon size={24} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {stat.title}
                  </Text>
                  <Text size="xl" fw={700}>
                    {stat.value}
                  </Text>
                </div>
              </Group>
            </Card>
          </Link>
        ))}
      </SimpleGrid>

      <div>
        <Title order={3} mb="md">{t("sections.quickActions")}</Title>
        <Text c="dimmed" size="sm">
          {t("sidebarHint")}
        </Text>
      </div>
    </Stack>
  );
}
