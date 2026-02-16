/**
 * Public user profile page
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import {
  Container,
  Title,
  Text,
  Stack,
  Loader,
  Center,
  Alert,
  Avatar,
  Group,
  Badge,
  Paper,
  Box,
} from "@mantine/core";
import { IconAlertCircle, IconHeart, IconUser } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getUserProfile, getUserPosts } from "@/api/users";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { username } = useParams({ from: "/profile/$username" });
  const { t } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => getUserProfile(username!),
    enabled: !!username,
  });

  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ["userPosts", username],
    queryFn: () => getUserPosts(username!),
    enabled: !!username,
  });

  if (profileLoading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (profileError || !profile) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title={tCommon("status.error")} color="red">
          {profileError instanceof Error
            ? profileError.message
            : t("errors.profileNotFound")}
        </Alert>
      </Container>
    );
  }

  const displayName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : null;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Profile Header */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Group align="flex-start" gap="lg">
            <Avatar size={100} radius="xl" color="blue">
              <IconUser size={60} />
            </Avatar>
            <Stack gap="xs" style={{ flex: 1 }}>
              <Group gap="sm">
                <Title order={2}>@{profile.username}</Title>
                {profile.is_seller && (
                  <Badge color="green" variant="filled">
                    {t("badges.seller")}
                  </Badge>
                )}
              </Group>
              {displayName && (
                <Text size="lg" c="dimmed">
                  {displayName}
                </Text>
              )}
              {profile.bio && (
                <Text size="md" mt="xs">
                  {profile.bio}
                </Text>
              )}
              <Group gap="lg" mt="md">
                <Group gap={4}>
                  <IconHeart size={20} color="var(--mantine-color-red-6)" />
                  <Text fw={600}>{profile.total_likes}</Text>
                  <Text c="dimmed">{t("stats.totalLikes")}</Text>
                </Group>
              </Group>
            </Stack>
          </Group>
        </Paper>

        {/* Listings Section */}
        <div>
          <Title order={3} mb="md">
            {t("sections.listings")}
          </Title>
          {postsLoading ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : postsError ? (
            <Alert color="red">{t("errors.failedToLoadPosts")}</Alert>
          ) : posts && posts.length > 0 ? (
            <>
              {/* Desktop Grid */}
              <Box visibleFrom="sm">
                <div className={styles.grid}>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </Box>

              {/* Mobile Feed */}
              <Box hiddenFrom="sm">
                <Stack gap={0}>
                  {posts.map((post) => (
                    <PostFeedItem key={post.id} post={post} />
                  ))}
                </Stack>
              </Box>
            </>
          ) : (
            <Paper p="xl" withBorder ta="center">
              <Text c="dimmed">{t("empty.noListings")}</Text>
            </Paper>
          )}
        </div>
      </Stack>
    </Container>
  );
}
