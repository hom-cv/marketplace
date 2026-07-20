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

export function SellerInfoCard({ user, isOwner }: SellerInfoCardProps) {
  const { t } = useTranslation("profile");
  const { data: profile } = useUserProfile(user.username);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const rating = profile?.rating ?? 0;

  const content = (
    <div className={styles.sellerInfo}>
      <div className={styles.sellerAvatar}>
        {user.username.charAt(0).toUpperCase()}
      </div>
      <div className={styles.sellerDetails}>
        <div className={styles.sellerUsername}>@{user.username}</div>
        {rating > 0 && (
          <div className={styles.sellerRating}>
            {Array.from({ length: 5 }, (_, i) => {
              if (rating >= i + 1)
                return <IconStarFilled key={i} size={13} />;
              if (rating >= i + 0.5)
                return <IconStarHalfFilled key={i} size={13} />;
              return <IconStar key={i} size={13} stroke={1.25} />;
            })}
          </div>
        )}
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
