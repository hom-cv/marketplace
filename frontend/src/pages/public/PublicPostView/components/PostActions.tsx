/**
 * PostActions - Buy button, sold state, and earnings preview for owners
 */

import { IconShoppingCart, IconMessage } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { EarningsPreview } from "@/components/EarningsPreview";
import type { Post } from "@/api/types/post";
import styles from "../PublicPostViewPage.module.css";

interface PostActionsProps {
  post: Post;
  postId: number | null;
  isOwner: boolean;
  isBanned: boolean;
  onBuyClick: () => void;
  onMessageClick?: () => void;
  isMessaging?: boolean;
}

export function PostActions({
  post,
  postId,
  isOwner,
  isBanned,
  onBuyClick,
  onMessageClick,
  isMessaging,
}: PostActionsProps) {
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");

  const price = parseFloat(post.price);

  return (
    <>
      {/* Ban Warning */}
      {isBanned && (
        <Alert variant="error">
          {post.is_banned
            ? t("view.listingRemoved")
            : t("view.sellerSuspended")}
        </Alert>
      )}

      {/* Buy Button - hide for owners, show sold state */}
      {!isOwner &&
        (post.is_sold ? (
          <div className={styles.soldButton}>{tCommon("badges.sold")}</div>
        ) : (
          <button
            className={styles.buyButtonDesktop}
            onClick={onBuyClick}
            disabled={isBanned}
          >
            <IconShoppingCart size={20} />
            {t("view.buyNow")} - ฿{price.toLocaleString()}
          </button>
        ))}

      {/* Message Seller - hide for owners and sold items */}
      {!isOwner && !post.is_sold && onMessageClick && (
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          leftIcon={<IconMessage size={20} />}
          onClick={onMessageClick}
          disabled={isBanned || isMessaging}
        >
          {t("view.messageSeller")}
        </Button>
      )}

      {/* Earnings Preview - only show for owners */}
      {isOwner && (
        <EarningsPreview
          postId={postId ?? undefined}
          title={t("view.yourEarnings")}
        />
      )}
    </>
  );
}
