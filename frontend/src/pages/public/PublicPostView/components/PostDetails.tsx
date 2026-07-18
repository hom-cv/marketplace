/**
 * PostDetails - Displays post title, badges, price, size, description, and measurements
 */

import { Group, Anchor } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LikeButton } from "@/components/LikeButton";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { categoryLabel, subcategoryLabel } from "@/constants/postTypes";
import type { Post } from "@/api/types/post";
import { formatSize } from "@/api/types/post";
import styles from "../PublicPostViewPage.module.css";

interface PostDetailsProps {
  post: Post;
  isOwner: boolean;
  onLikeAuthRequired: () => void;
}

export function PostDetails({
  post,
  isOwner,
  onLikeAuthRequired,
}: PostDetailsProps) {
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const { data: taxonomy } = useCategoryTree();

  const price = parseFloat(post.price);
  const shippingCost = parseFloat(post.shipping_cost || "0");
  const brand = post.brand;

  return (
    <>
      {/* Header cluster: badges, brand, title, price kept tight together */}
      <div className={styles.headerGroup}>
        {/* Status badges */}
        {(isOwner ||
          post.is_sold ||
          (post.is_reserved && !post.is_reserved_by_viewer)) && (
          <div className={styles.badges}>
            {isOwner && (
              <span className={`${styles.badge} ${styles.badgeOwner}`}>
                {t("view.yourListing")}
              </span>
            )}
            {post.is_sold && (
              <span className={`${styles.badge} ${styles.badgeSold}`}>
                {tCommon("badges.sold")}
              </span>
            )}
            {!post.is_sold &&
              post.is_reserved &&
              !post.is_reserved_by_viewer && (
                <span className={`${styles.badge} ${styles.badgeSold}`}>
                  {tCommon("badges.reserved")}
                </span>
              )}
          </div>
        )}

        {/* Brand */}
        {brand && (
          <div>
            <Anchor
              component="button"
              type="button"
              c="dimmed"
              fw={600}
              size="sm"
              tt="uppercase"
              underline="hover"
              onClick={() =>
                navigate({
                  to: "/explore",
                  search: { brands: [brand.slug] },
                })
              }
            >
              {brand.name}
            </Anchor>
          </div>
        )}

        {/* Title */}
        <h1 className={styles.title}>{post.title}</h1>

        {/* Price and Like */}
        <div className={styles.priceRow}>
          <div className={styles.priceSection}>
            <span className={styles.price}>฿{price.toLocaleString()}</span>
            {shippingCost > 0 ? (
              <span className={styles.shippingCost}>
                + ฿{shippingCost.toLocaleString()} {t("view.shipping")}
              </span>
            ) : (
              <span className={styles.freeShipping}>
                {t("view.freeShipping")}
              </span>
            )}
          </div>
          <LikeButton
            key={`${post.id}-${post.is_liked}-${post.like_count}`}
            postId={post.id}
            initialLiked={post.is_liked}
            initialCount={post.like_count}
            size="lg"
            onAuthRequired={onLikeAuthRequired}
          />
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Body fields: size, description, measurements, tags kept compact */}
      <div className={styles.detailBody}>
        {/* Size + Category, side by side */}
        <div className={styles.metaRow}>
          {post.size && (
            <div className={styles.metaField}>
              <div className={styles.sectionLabel}>
                {tCommon("postCard.size")}
              </div>
              <span className={styles.sizeBadge}>
                {formatSize(post.size, post.size_group)}
              </span>
            </div>
          )}

          <div className={styles.metaField}>
            <div className={styles.sectionLabel}>{t("create.form.category")}</div>
            <div className={styles.metaBadges}>
              <span className={styles.sizeBadge}>
                {categoryLabel(t, taxonomy, post.category)}
              </span>
              {post.subcategory && (
                <span className={styles.sizeBadge}>
                  {subcategoryLabel(t, taxonomy, post.subcategory)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className={styles.sectionLabel}>{t("view.description")}</div>
          <p className={styles.description}>{post.description}</p>
        </div>

        {/* Measurements Section */}
        {post.measurements && (
          <MeasurementsDisplay measurements={post.measurements} />
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div>
            <div className={styles.sectionLabel}>{t("view.tags")}</div>
            <Group gap="md">
              {post.tags.map((tag) => (
                <Anchor
                  key={tag}
                  component="button"
                  type="button"
                  c="dimmed"
                  size="sm"
                  underline="hover"
                  onClick={() =>
                    navigate({ to: "/explore", search: { tags: [tag] } })
                  }
                >
                  #{tag}
                </Anchor>
              ))}
            </Group>
          </div>
        )}
      </div>

      <hr className={styles.divider} />
    </>
  );
}
