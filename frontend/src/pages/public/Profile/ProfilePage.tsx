/**
 * Public user profile page - Flat design
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Loader, Box } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getUserProfile, getUserPosts } from "@/api/users";
import { Alert } from "@/components/Alert";
import { FollowButton } from "@/components/FollowButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { useAuthStore } from "@/stores/authStore";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { username } = useParams({ from: "/profile/$username" });
  const { t } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");
  const currentUser = useAuthStore((state) => state.user);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

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
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className={styles.errorContainer}>
        <Alert variant="error" title={tCommon("status.error")}>
          {profileError instanceof Error
            ? profileError.message
            : t("errors.profileNotFound")}
        </Alert>
      </div>
    );
  }

  const displayName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : null;

  const isOwnProfile = currentUser?.username === profile.username;

  const statsContent = (
    <>
      <div className={styles.stat}>
        <span className={styles.statValue}>{profile.follower_count}</span>
        <span className={styles.statLabel}>{t("stats.followers")}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statValue}>{profile.total_likes}</span>
        <span className={styles.statLabel}>{t("stats.totalLikes")}</span>
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.profileContent}>
            {/* Left: Avatar */}
            <div className={styles.avatar}>
              <IconUser size={48} />
            </div>

            {/* Right: Info + Follow */}
            <div className={styles.profileInfo}>
              <div className={styles.topRow}>
                <h1 className={styles.username}>@{profile.username}</h1>
                {profile.is_seller && (
                  <span className={styles.badge}>{t("badges.seller")}</span>
                )}
                <Box visibleFrom="sm" className={styles.statContainer}>
                  {statsContent}
                </Box>
              </div>
              {displayName && (
                <p className={styles.displayName}>{displayName}</p>
              )}
              {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
              <Box hiddenFrom="sm" className={styles.mobileStats}>
                {statsContent}
              </Box>
              {!isOwnProfile && (
                <div className={styles.followAction}>
                  <FollowButton
                    userId={profile.id}
                    initialFollowed={profile.is_followed}
                    size="lg"
                    fullWidth
                    onAuthRequired={() => setLoginPromptOpen(true)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("sections.listings")}</h2>
          {postsLoading ? (
            <div className={styles.loading}>
              <Loader />
            </div>
          ) : postsError ? (
            <Alert variant="error">{t("errors.failedToLoadPosts")}</Alert>
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
                <div>
                  {posts.map((post) => (
                    <PostFeedItem key={post.id} post={post} />
                  ))}
                </div>
              </Box>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{t("empty.noListings")}</p>
            </div>
          )}
        </div>
      </div>

      <LoginPromptModal
        opened={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        action={t("follow.followAction")}
      />
    </div>
  );
}
