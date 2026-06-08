/**
 * ListingSidebar - Rich listing summary mirroring the post view page
 * Shows image carousel, title, price, size, description, measurements, seller
 */

import { Link } from "@tanstack/react-router";
import { IconChevronRight, IconExternalLink, IconPhoto, IconRosetteDiscountCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { PostImageCarousel } from "@/components/PostImageCarousel";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import type { Post } from "@/api/types/post";
import { formatSize } from "@/api/types/post";
import styles from "./ListingSidebar.module.css";

interface ListingSidebarProps {
  post: Post;
}

export function ListingSidebar({ post }: ListingSidebarProps) {
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");

  const price = parseFloat(post.price);
  const shippingCost = parseFloat(post.shipping_cost || "0");

  const imageUrls =
    post.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post.image_url
        ? [post.image_url]
        : [];

  return (
    <div className={styles.sidebar}>
      {/* Image */}
      <div className={styles.imageSection}>
        {imageUrls.length > 0 ? (
          <PostImageCarousel imageUrls={imageUrls} alt={post.title} />
        ) : (
          <div className={styles.imagePlaceholder}>
            <IconPhoto size={40} />
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className={styles.content}>
        {/* Sold badge */}
        {post.is_sold && (
          <span className={styles.soldBadge}>{tCommon("badges.sold")}</span>
        )}

        {/* Title */}
        <h2 className={styles.title}>{post.title}</h2>

        {/* Price */}
        <div className={styles.priceSection}>
          <span className={styles.price}>฿{price.toLocaleString()}</span>
          {shippingCost > 0 ? (
            <span className={styles.shipping}>
              + ฿{shippingCost.toLocaleString()} {t("view.shipping")}
            </span>
          ) : (
            <span className={styles.freeShipping}>{t("view.freeShipping")}</span>
          )}
        </div>

        <hr className={styles.divider} />

        {/* Size */}
        {post.size && (
          <div>
            <div className={styles.sectionLabel}>{tCommon("postCard.size")}</div>
            <span className={styles.sizeBadge}>
              {formatSize(post.size, post.type)}
            </span>
          </div>
        )}

        {/* Description */}
        <div>
          <div className={styles.sectionLabel}>{t("view.description")}</div>
          <p className={styles.description}>{post.description}</p>
        </div>

        {/* Measurements */}
        {post.measurements && (
          <MeasurementsDisplay measurements={post.measurements} />
        )}
      </div>

      {/* Pinned footer - always visible */}
      <div className={styles.footer}>
        <hr className={styles.divider} />

        {/* Seller card */}
        <Link
          to="/profile/$username"
          params={{ username: post.user.username }}
          className={styles.sellerCard}
        >
          <div className={styles.sellerAvatar}>
            {post.user.username.charAt(0).toUpperCase()}
          </div>
          <div className={styles.sellerDetails}>
            <div className={styles.sellerNameRow}>
              <span className={styles.sellerName}>@{post.user.username}</span>
              {post.user.is_seller && (
                <IconRosetteDiscountCheck size={14} className={styles.sellerBadgeIcon} />
              )}
            </div>
            {post.user.show_full_name && post.user.first_name && (
              <span className={styles.sellerFullName}>
                {[post.user.first_name, post.user.last_name]
                  .filter(Boolean)
                  .join(" ")}
              </span>
            )}
            {post.user.bio && (
              <p className={styles.sellerBio}>{post.user.bio}</p>
            )}
          </div>
          <IconChevronRight size={16} className={styles.sellerArrow} />
        </Link>

        {/* View listing link */}
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
