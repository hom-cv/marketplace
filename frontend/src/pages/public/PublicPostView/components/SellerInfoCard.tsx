/**
 * SellerInfoCard - Displays seller information with optional link to profile
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  IconStar,
  IconStarFilled,
  IconStarHalfFilled,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Post } from "@/api/types/post";
import { FollowButton } from "@/components/FollowButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useUserProfile } from "@/hooks/useUsers";
import styles from "../PublicPostViewPage.module.css";

interface SellerInfoCardProps {
  user: Post["user"];
  isOwner: boolean;
}

// ponytail: placeholder rating until reviews exist — swap for profile.rating
const RATING = 4.5;

export function SellerInfoCard({ user, isOwner }: SellerInfoCardProps) {
  const { t } = useTranslation("profile");
  const { data: profile } = useUserProfile(user.username);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const content = (
    <div className={styles.sellerInfo}>
      <div className={styles.sellerAvatar}>
        {user.username.charAt(0).toUpperCase()}
      </div>
      <div className={styles.sellerDetails}>
        <div className={styles.sellerUsername}>@{user.username}</div>
        <div className={styles.sellerRating}>
          {Array.from({ length: 5 }, (_, i) => {
            if (RATING >= i + 1)
              return <IconStarFilled key={i} size={13} />;
            if (RATING >= i + 0.5)
              return <IconStarHalfFilled key={i} size={13} />;
            return <IconStar key={i} size={13} stroke={1.25} />;
          })}
        </div>
        {profile && (
          <div className={styles.sellerStats}>
            <span>
              {profile.completed_sales} {t("stats.completedSales")}
            </span>
            <span>
              {profile.follower_count} {t("stats.followers")}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (isOwner) {
    return <div className={styles.sellerCardStatic}>{content}</div>;
  }

  return (
    <>
      <div className={styles.sellerCard}>
        <Link
          to="/profile/$username"
          params={{ username: user.username }}
          className={styles.sellerLink}
        >
          {content}
        </Link>
        <FollowButton
          userId={user.id}
          username={user.username}
          initialFollowed={profile?.is_followed ?? false}
          onAuthRequired={() => setLoginPromptOpen(true)}
        />
      </div>

      <LoginPromptModal
        opened={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        action={t("follow.followAction")}
      />
    </>
  );
}
