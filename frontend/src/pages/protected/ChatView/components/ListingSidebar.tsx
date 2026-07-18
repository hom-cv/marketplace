/**
 * ListingSidebar - Rich listing summary mirroring the post view page
 * Shows image carousel, title, price, size, description, measurements, seller
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconPhoto,
  IconRosetteDiscountCheck,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
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
  const [index, setIndex] = useState(0);

  const price = parseFloat(post.price);
  const shippingCost = parseFloat(post.shipping_cost || "0");

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

      {/* Scrollable content */}
      <div className={styles.content}>
        {/* Header: brand eyebrow, title, price */}
        <div className={styles.header}>
          <div className={styles.eyebrow}>
            {post.brand && <span className={styles.brand}>{post.brand.name}</span>}
            {post.is_sold && (
              <span className={styles.soldBadge}>{tCommon("badges.sold")}</span>
            )}
          </div>

          <h2 className={styles.title}>{post.title}</h2>

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
        </div>

        <hr className={styles.divider} />

        {/* Size — label / value row */}
        {post.size && (
          <div className={styles.specRow}>
            <span className={styles.specLabel}>{tCommon("postCard.size")}</span>
            <span className={styles.sizeBadge}>
              {formatSize(post.size, post.size_group)}
            </span>
          </div>
        )}

        {/* Description */}
        {post.description && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>{t("view.description")}</div>
            <p className={styles.description}>{post.description}</p>
          </div>
        )}

        {/* Measurements */}
        {post.measurements && (
          <MeasurementsDisplay measurements={post.measurements} />
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>{t("view.tags")}</div>
            <div className={styles.tags}>
              {post.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pinned footer - always visible */}
      <div className={styles.footer}>
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
