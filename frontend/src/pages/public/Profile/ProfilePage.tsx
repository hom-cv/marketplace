/**
 * Public user profile page - Clean & Minimal design
 * Features: Horizontal profile card layout, inline stats
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import {
  Container,
  Title,
  Text,
  Loader,
  Center,
  Alert,
  Avatar,
  Group,
  Badge,
  Box,
  SegmentedControl,
} from "@mantine/core";
import { useState } from "react";
import { IconAlertCircle, IconHeart, IconShoppingBag, IconUser } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getUserProfile, getUserPosts } from "@/api/users";
import { PostCard } from "@/components/PostCard";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { username } = useParams({ strict: false });
  const { t } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("all");

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
        <Loader size="md" />
      </Center>
    );
  }

  if (profileError || !profile) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title={tCommon("status.error")} color="red" radius="lg">
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

  // Filter posts based on tab
  const filteredPosts = posts?.filter((post) => {
    if (activeTab === "available") return !post.is_sold;
    if (activeTab === "sold") return post.is_sold;
    return true;
  });

  const availableCount = posts?.filter((p) => !p.is_sold).length ?? 0;
  const soldCount = posts?.filter((p) => p.is_sold).length ?? 0;

  return (
    <div className={styles.wrapper}>
      <Container size="lg" className={styles.container}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          {/* Avatar */}
          <Avatar size={80} radius="xl" color="blue" className={styles.avatar}>
            <IconUser size={36} />
          </Avatar>

          {/* Info */}
          <div className={styles.profileInfo}>
            <Group gap="sm" align="center">
              <Title order={4} className={styles.username}>@{profile.username}</Title>
              {profile.is_seller && (
                <Badge color="blue" variant="light" radius="md" size="sm">
                  {t("badges.seller")}
                </Badge>
              )}
            </Group>
            {displayName && (
              <Text size="sm" c="dimmed" className={styles.displayName}>
                {displayName}
              </Text>
            )}
            {profile.bio && (
              <Text size="sm" className={styles.bio}>
                {profile.bio}
              </Text>
            )}

            {/* Stats Row - inline with profile info */}
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <IconShoppingBag size={14} color="var(--mantine-color-dimmed)" />
                <Text className={styles.statValue}>{posts?.length ?? 0}</Text>
                <Text className={styles.statLabel}>{t("stats.listings")}</Text>
              </div>
              <div className={styles.statItem}>
                <IconHeart size={14} color="var(--mantine-color-red-5)" />
                <Text className={styles.statValue}>{profile.total_likes}</Text>
                <Text className={styles.statLabel}>{t("stats.totalLikes")}</Text>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Box mb="md">
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            data={[
              { label: `${t("tabs.all")} (${posts?.length ?? 0})`, value: "all" },
              { label: `${t("tabs.available")} (${availableCount})`, value: "available" },
              { label: `${t("tabs.sold")} (${soldCount})`, value: "sold" },
            ]}
            radius="md"
            size="sm"
            fullWidth
            className={styles.segmentedControl}
          />
        </Box>

        {/* Listings Section */}
        <div className={styles.listingsSection}>
          {postsLoading ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : postsError ? (
            <Alert color="red" radius="lg">{t("errors.failedToLoadPosts")}</Alert>
          ) : filteredPosts && filteredPosts.length > 0 ? (
            <div className={styles.grid}>
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Center h={200}>
              <Text c="dimmed">{t("empty.noListings")}</Text>
            </Center>
          )}
        </div>
      </Container>
    </div>
  );
}
