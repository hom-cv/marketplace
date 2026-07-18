/**
 * ListingSidebar - Listing preview beside a chat. Reuses the listing-detail
 * pieces (PostDetails, SellerInfoCard, PostActions) so the two views share the
 * same styling and never drift. Only the image and panel layout are local.
 */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconPhoto,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  PostActions,
  PostDetails,
  SellerInfoCard,
} from "@/pages/public/PublicPostView/components";
import { useAuthStore } from "@/stores/authStore";
import type { Post } from "@/api/types/post";
import styles from "./ListingSidebar.module.css";

interface ListingSidebarProps {
  post: Post;
}

export function ListingSidebar({ post }: ListingSidebarProps) {
  const { t } = useTranslation("listings");
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [index, setIndex] = useState(0);

  const isBanned = !!(post.is_banned || post.is_user_banned);
  const isOwner = currentUser?.id === post.user.id;
  const canShowBuy = !!currentUser && !isOwner;

  const imageUrls =
    post.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post.image_url
        ? [post.image_url]
        : [];
  const current = Math.min(index, imageUrls.length - 1);
  const hasMultiple = imageUrls.length > 1;
  const step = (delta: number) =>
    setIndex((current + delta + imageUrls.length) % imageUrls.length);

  const handleBuy = () =>
    navigate({ to: "/checkout/$postId", params: { postId: String(post.id) } });

  return (
    <div className={styles.sidebar}>
      {/* Image */}
      <div className={styles.imageSection}>
        <div className={styles.imageFrame}>
          {imageUrls.length > 0 ? (
            <img
              src={imageUrls[current]}
              alt={post.title}
              className={styles.image}
            />
          ) : (
            <div className={styles.imagePlaceholder}>
              <IconPhoto size={40} />
            </div>
          )}

          {hasMultiple && (
            <>
              <button
                type="button"
                className={`${styles.navButton} ${styles.navPrev}`}
                onClick={() => step(-1)}
                aria-label={t("images.previous", "Previous image")}
              >
                <IconChevronLeft size={18} />
              </button>
              <button
                type="button"
                className={`${styles.navButton} ${styles.navNext}`}
                onClick={() => step(1)}
                aria-label={t("images.next", "Next image")}
              >
                <IconChevronRight size={18} />
              </button>
              <div className={styles.imageCount}>
                {current + 1}/{imageUrls.length}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content - shared listing-detail body */}
      <div className={styles.content}>
        <PostDetails post={post} isOwner={isOwner} onLikeAuthRequired={() => {}} />
      </div>

      {/* Pinned footer - shared seller card + buy action */}
      <div className={styles.footer}>
        <SellerInfoCard user={post.user} isOwner={isOwner} />

        {canShowBuy && (
          <PostActions
            post={post}
            postId={post.id}
            isOwner={false}
            isBanned={isBanned}
            onBuyClick={handleBuy}
          />
        )}

        <Link
          to="/explore/$postId"
          params={{ postId: String(post.id) }}
          className={styles.viewListingLink}
        >
          {t("view.viewListing")}
          <IconExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
