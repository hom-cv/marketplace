/**
 * SellerInfoCard - Displays seller information with optional link to profile
 */

import { Link } from "@tanstack/react-router";
import { IconChevronRight } from "@tabler/icons-react";
import type { Post } from "@/api/types/post";
import styles from "../PublicPostViewPage.module.css";

interface SellerInfoCardProps {
  user: Post["user"];
  isOwner: boolean;
}

export function SellerInfoCard({ user, isOwner }: SellerInfoCardProps) {
  const content = (
    <div className={styles.sellerInfo}>
      <div className={styles.sellerAvatar}>
        {user.username.charAt(0).toUpperCase()}
      </div>
      <div className={styles.sellerDetails}>
        <div className={styles.sellerUsername}>@{user.username}</div>
      </div>
    </div>
  );

  if (isOwner) {
    return <div className={styles.sellerCardStatic}>{content}</div>;
  }

  return (
    <Link
      to="/profile/$username"
      params={{ username: user.username }}
      className={styles.sellerCard}
    >
      {content}
      <IconChevronRight size={20} className={styles.sellerArrow} />
    </Link>
  );
}
