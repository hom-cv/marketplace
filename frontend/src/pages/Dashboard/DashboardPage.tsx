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
import { getPosts, getMyPosts } from "@/api/posts";

export function DashboardPage() {
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
      title: "My Listings",
      value: myPosts?.length || 0,
      icon: IconPackage,
      color: "blue",
      link: "/app/my-listings",
    },
    {
      title: "Marketplace Items",
      value: allPosts?.total || 0,
      icon: IconTrendingUp,
      color: "green",
      link: "/app/explore",
    },
    {
      title: "Purchases",
      value: 0,
      icon: IconShoppingBag,
      color: "orange",
      link: "/app/purchases",
    },
    {
      title: "Sales",
      value: 0,
      icon: IconReceipt,
      color: "grape",
      link: "/app/sales",
    },
  ];

  return (
    <Stack gap="xl">
      <div>
        <Title order={2} mb="xs">Dashboard</Title>
        <Text c="dimmed">Welcome back! Here's an overview of your activity.</Text>
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
        <Title order={3} mb="md">Quick Actions</Title>
        <Text c="dimmed" size="sm">
          Use the sidebar to navigate between sections, or click on the stats above to view details.
        </Text>
      </div>
    </Stack>
  );
}
