/**
 * Public user profile page - Flat design
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Loader, Box } from "@mantine/core";
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
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <IconAlertCircle size={20} className={styles.errorIcon} />
          <div className={styles.errorContent}>
            <p className={styles.errorTitle}>{tCommon("status.error")}</p>
            <p className={styles.errorMessage}>
              {profileError instanceof Error
                ? profileError.message
                : t("errors.profileNotFound")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.profileContent}>
            <div className={styles.avatar}>
              <IconUser size={48} />
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.usernameRow}>
                <h1 className={styles.username}>@{profile.username}</h1>
                {profile.is_seller && (
                  <span className={styles.badge}>{t("badges.seller")}</span>
                )}
              </div>
              {displayName && (
                <p className={styles.displayName}>{displayName}</p>
              )}
              {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <IconHeart size={18} className={styles.statIcon} />
                  <span className={styles.statValue}>{profile.total_likes}</span>
                  <span className={styles.statLabel}>{t("stats.totalLikes")}</span>
                </div>
              </div>
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
            <div className={styles.errorCard}>
              <IconAlertCircle size={20} className={styles.errorIcon} />
              <div className={styles.errorContent}>
                <p className={styles.errorMessage}>{t("errors.failedToLoadPosts")}</p>
              </div>
            </div>
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
    </div>
  );
}
