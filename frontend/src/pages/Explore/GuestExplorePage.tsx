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
      <Container size="xl" py="xl">
        <Center h={300}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error instanceof Error ? error.message : t("errors.failedToLoad")}
        </Alert>
      </Container>
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
              <Title order={2}>{t("title")}</Title>
              <Text size="sm" c="dimmed">
                {data?.total ?? 0} {(data?.total ?? 0) === 1 ? t("results.listing") : t("results.listings")}
              </Text>
            </Group>

            {/* Grid of cards */}
            {posts.length === 0 ? (
              <Center h={200}>
                <Text c="dimmed">{t("results.noListings")}</Text>
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
            <Group gap={8} align="center">
              <IconLock size={24} style={{ opacity: 0.7 }} />
              <Title order={3}>{tCommon("guestExplore.signUpToSeeMore")}</Title>
            </Group>
            <Text c="dimmed" size="sm" ta="center">
              {tCommon("guestExplore.subtitle")}
            </Text>
            <Group gap="md">
              <Button
                size="md"
                variant="default"
                onClick={() => navigate({ to: "/login" })}
              >
                {tCommon("buttons.logIn")}
              </Button>
              <Button
                size="md"
                onClick={() => navigate({ to: "/sign-up" })}
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
