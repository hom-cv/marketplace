import { useQuery } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  Loader,
  Center,
  Alert,
  Button,
  Card,
  ThemeIcon,
} from "@mantine/core";
import { IconAlertCircle, IconPlus, IconPackage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getMyPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import styles from "./MyListingsPage.module.css";

export function MyListingsPage() {
  const { t } = useTranslation("listings");
  const { t: tNav } = useTranslation("navigation");

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts", "me"],
    queryFn: () => getMyPosts(),
  });

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error instanceof Error ? error.message : t("myListings.failedToLoad")}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">{t("myListings.title")}</Title>
        <Text c="dimmed">{tNav("menu.myListings")}</Text>
      </div>

      {!posts || posts.length === 0 ? (
        <Center py="xl">
          <Card padding="xl" radius="md" withBorder ta="center" maw={400}>
            <Stack align="center" gap="md">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconPackage size={24} />
              </ThemeIcon>
              <div>
                <Text fw={500}>{t("myListings.noListings")}</Text>
                <Text size="sm" c="dimmed" mb="md">
                  {t("myListings.createFirst")}
                </Text>
                <Link to="/app/posts/new">
                  <Button leftSection={<IconPlus size={16} />}>{tNav("menu.createListing")}</Button>
                </Link>
              </div>
            </Stack>
          </Card>
        </Center>
      ) : (
        <div className={styles.grid}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </Stack>
  );
}
