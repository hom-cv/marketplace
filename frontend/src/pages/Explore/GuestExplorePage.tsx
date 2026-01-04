/**
 * Guest Explore Page - Public preview of the explore grid
 * Shows a limited view with a fade overlay and signup CTA
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Loader,
  Center,
  Alert,
  Text,
  Stack,
  Group,
  Title,
  Button,
  Container,
  ThemeIcon,
} from "@mantine/core";
import { IconAlertCircle, IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import styles from "./GuestExplorePage.module.css";

export function GuestExplorePage() {
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();

  // Fetch only a limited set of posts for preview
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", "guest-preview"],
    queryFn: () => getPosts(0, 12), // Only fetch 12 items for preview
  });

  const posts = useMemo(() => {
    return data?.items ?? [];
  }, [data]);

  // Handle click on any card - redirect to login
  const handleCardClick = () => {
    navigate({ to: "/login" });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="lg" type="dots" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Container size="xl">
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="filled">
            {error instanceof Error ? error.message : t("errors.failedToLoad")}
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Main content area with fixed height and overflow hidden */}
      <div className={styles.contentArea}>
        <Container size="xl" py="xl">
          <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between" align="center" wrap="wrap">
              <Title order={2} fw={800} style={{ letterSpacing: '-0.02em' }}>{t("title")}</Title>
              <Text c="dimmed" fw={500}>
                {data?.total ?? 0} {(data?.total ?? 0) === 1 ? t("results.listing") : t("results.listings")}
              </Text>
            </Group>

            {/* Grid of cards */}
            {posts.length === 0 ? (
              <Center h={300}>
                <Text c="dimmed" size="lg">{t("results.noListings")}</Text>
              </Center>
            ) : (
              <div className={styles.grid}>
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={styles.cardWrapper}
                    onClick={handleCardClick}
                  >
                    <PostCard post={post} />
                  </div>
                ))}
              </div>
            )}
          </Stack>
        </Container>
      </div>

      {/* Fixed bottom fade overlay with CTA */}
      <div className={styles.fadeOverlay}>
        <div className={styles.ctaContainer}>
          <Stack align="center" gap="md">
            <Group gap={12} align="center" mb={4}>
              <ThemeIcon size={42} radius="xl" variant="light" color="gray">
                <IconLock size={20} />
              </ThemeIcon>
              <div>
                <Title order={3} size="h3" fw={700} style={{ lineHeight: 1.2 }}>
                  {tCommon("guestExplore.signUpToSeeMore")}
                </Title>
              </div>
            </Group>

            <Text c="dimmed" size="sm" ta="center" maw={400} lh={1.5}>
              {tCommon("guestExplore.subtitle")}
            </Text>

            <Group gap="md" mt="xs">
              <Button
                size="md"
                variant="default"
                radius="xl"
                fw={600}
                onClick={() => navigate({ to: "/login" })}
              >
                {tCommon("buttons.logIn")}
              </Button>
              <Button
                size="md"
                radius="xl"
                fw={600}
                onClick={() => navigate({ to: "/sign-up" })}
                variant="filled"
                color="blue"
              >
                {tCommon("buttons.signUp")}
              </Button>
            </Group>
          </Stack>
        </div>
      </div>
    </div>
  );
}
